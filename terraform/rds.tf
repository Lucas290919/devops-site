resource "aws_db_subnet_group" "db_subnet_group" {
   subnet_ids = [aws_subnet.private1.id, aws_subnet.private2.id]
   tags = {
     "Name" = "database_sbg"
   }
}

resource "aws_db_instance" "database" {
  allocated_storage    = 10
  db_name              = "devops-site"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.medium"
  username             = var.db_username
  password             = var.db_password
  parameter_group_name = "default.mysql8.0"
  skip_final_snapshot  = true
  db_subnet_group_name = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
}
