variable "instance_type" {
  type = string
  default  = "t3.micro"
}
variable "availability_zone" {
  type = string
  default = "us-east-1a"
}
variable "availability_zone_RDS1" {
  type = string
  default = "us-east-1b"
}

variable "db_username" {
  description = "Usuário master do banco de dados RDS"
  type        = string
}

variable "db_password" {
  description = "Senha master do banco de dados RDS"
  type        = string
  sensitive   = true
}