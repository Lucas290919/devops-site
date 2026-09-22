# Package the Lambda function code
data "archive_file" "database" {
  type        = "zip"
  source_dir  = "${path.module}/../lamda-migration/"
  output_path = "${path.module}/lambda-migration.zip"
}

# Lambda function
resource "aws_lambda_function" "migration-database" {
  filename      = data.archive_file.database.output_path
  function_name = "database_lambda_function"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "index.handler"
  code_sha256   = data.archive_file.database.output_base64sha256

  vpc_config {
    subnet_ids         = [aws_subnet.private1.id, aws_subnet.private2.id]
    security_group_ids = [aws_security_group.migration_sg.id]
  }

  runtime = "nodejs24.x"
  # Timeout estendido (padrao e 3s): conexao com VPC + SSM + RDS pode levar mais de 3 segundos no cold start
  timeout = 60

  depends_on = [
    aws_iam_role_policy_attachment.lambda_vpc_access,
    aws_iam_role_policy.lambda_migration_policy
  ]

  environment {
    variables = {
      DB_HOST           = aws_db_instance.database.address
      DB_USER           = aws_db_instance.database.username
      DB_NAME           = aws_db_instance.database.db_name
      SSM_PASSWORD_PATH = aws_ssm_parameter.db_password.name
    }
  }

  tags = {
    Environment = "production"
    Application = "example"
  }
}

resource "aws_lambda_invocation" "database_migration" {
  function_name = aws_lambda_function.migration-database.function_name
  input         = jsonencode({ action = "migrate" })

  triggers = {
    migration_hash = data.archive_file.database.output_base64sha256
    database_host  = aws_db_instance.database.address
  }

  depends_on = [aws_lambda_function.migration-database]
}