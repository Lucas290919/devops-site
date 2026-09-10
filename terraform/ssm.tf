resource "aws_ssm_parameter" "db_password" {
  name  = "/projeto-devops/database/password"
  type  = "SecureString"
  value = var.db_password 
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/projeto-devops/backend/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
}