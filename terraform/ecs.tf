resource "aws_ecs_cluster" "main" {
  name = "cluster_projeto_devops"
}

#atribuindo police

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy_front" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy_back" {
  role       = aws_iam_role.ecs_execution_role_back.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

#front-end

resource "aws_ecs_task_definition" "front_task" {
  family                   = "front-end-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  depends_on               = [aws_cloudwatch_log_group.logs_front]
  container_definitions = jsonencode([
    {
      name      = "front-end-container"
      image     = "lucasveneroso/projeto-devops:front-end"
      essential = true
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.logs_front.name
          "awslogs-region"        = "us-east-1"
          "awslogs-create-group"  = "true"
          "awslogs-stream-prefix" = "ecs/front_end"
        }
      }
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "front-end-service" {
  name            = "front-end-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.front_task.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  load_balancer {
    target_group_arn = aws_lb_target_group.target_group_front.arn
    container_name   = "front-end-container"
    container_port   = 80
  }

  network_configuration {
    subnets          = [aws_subnet.private1.id, aws_subnet.private2.id]
    security_groups  = [aws_security_group.frontend_sg.id]
    assign_public_ip = false
  }

  # Garante que a infraestrutura de rede (rotas/NAT) e permissoes IAM estejam
  # 100% criadas antes do Fargate tentar iniciar a primeira task.
  # Isso previne o erro "ResourceInitializationError: failed to validate logger args".
  depends_on = [
    aws_lb_listener.front_end_listener_lb,
    aws_route_table_association.private1_assoc,
    aws_route_table_association.private2_assoc,
    aws_iam_role_policy_attachment.ecs_execution_role_policy_front,
    aws_iam_role_policy.ecs_cloudwatch_logs_policy
  ]
}

#Back-end

resource "aws_ecs_task_definition" "back_task" {
  family                   = "back-end-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role_back.arn
  depends_on               = [aws_cloudwatch_log_group.logs_back]
  container_definitions = jsonencode([
    {
      name      = "back-end-container"
      image     = "lucasveneroso/projeto-devops:back-end"
      essential = true
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.logs_back.name
          "awslogs-region"        = "us-east-1"
          "awslogs-create-group"  = "true"
          "awslogs-stream-prefix" = "ecs/back_end"
        }
      }
      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = aws_ssm_parameter.db_password.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_ssm_parameter.jwt_secret.arn
        }
      ]
      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.database.address
        },
        {
          name  = "DB_USER"
          value = aws_db_instance.database.username
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.database.db_name
        }
      ]
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "back-end-service" {
  name            = "back-end-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.back_task.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  load_balancer {
    target_group_arn = aws_lb_target_group.target_group_back.arn
    container_name   = "back-end-container"
    container_port   = 3000
  }

  network_configuration {
    subnets          = [aws_subnet.private1.id, aws_subnet.private2.id]
    security_groups  = [aws_security_group.back_sg.id]
    assign_public_ip = false
  }

  # Garante que a infraestrutura de rede (rotas/NAT), ALB e permissoes IAM (inclusive SSM Secrets)
  # estejam 100% criadas antes do Fargate tentar iniciar a primeira task.
  depends_on = [
    aws_lb_listener_rule.backend_api,
    aws_route_table_association.private1_assoc,
    aws_route_table_association.private2_assoc,
    aws_iam_role_policy_attachment.ecs_execution_role_policy_back,
    aws_iam_role_policy.ecs_cloudwatch_logs_policy,
    aws_iam_role_policy.ecs_back_ssm_policy
  ]
}