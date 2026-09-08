resource "aws_ecs_cluster" "main" {
  name = "cluster_projeto_devops"
}

#atribuindo police

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
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
  container_definitions = jsonencode([
    {
      name      = "front-end-container"
      image     = "lucasveneroso/projeto-devops:front-end"
      essential = true

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
  desired_count   = 1                                      
  launch_type     = "FARGATE"                             

  network_configuration {
    subnets          = [aws_subnet.public.id]              
    security_groups  = [aws_security_group.front_sg.id]    
    assign_public_ip = true                               
  }
}

#Back-end
resource "aws_ecs_task_definition" "back_task" {
  family                   = "back-end-task"       
  network_mode             = "awsvpc"              
  requires_compatibilities = ["FARGATE"]              
  cpu                      = "256"                  
  memory                   = "512"                  
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn 
  container_definitions = jsonencode([
    {
      name      = "back-end-container"
      image     = "lucasveneroso/projeto-devops:back-end"
      essential = true
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
  desired_count   = 1                                      
  launch_type     = "FARGATE"                             

  network_configuration {
    subnets          = [aws_subnet.private1.id]              
    security_groups  = [aws_security_group.back_sg.id]    
    assign_public_ip = false                               
  }
}