terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.62.0"
    }
  }
}

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

provider "aws" {
  region = "us-east-1"
}

#
#
#
# Conexão de VPC
#
#
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true
  tags = {
    "Name" = "Vpc-Estudo"
  }
}

resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.10.0/24"
  availability_zone = var.availability_zone
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private1" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
  availability_zone = var.availability_zone
}
resource "aws_subnet" "private2" {
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  availability_zone = var.availability_zone_RDS1
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "igw-projeto"
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "rt-publica"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id     
  route_table_id = aws_route_table.public_rt.id
}

#
#
#
# Grupos de Segurança
#
#
resource "aws_security_group" "front_sg" {
  name = "front_sg"
  description = "permite trafego para acesso da web"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    "Name" = "subnet_front-end"
  }
}
resource "aws_security_group" "back_sg" {
  name = "back_sg"
  description = "Permite acesso a web para o back-End"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port = 8080
    to_port = 8080
    protocol = "tcp"
    security_groups = [ aws_security_group.front_sg.id ]
  }
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }


  tags = {
    "Name" = "subnet_back-end"
  }
}

resource "aws_security_group" "rds_sg" {
  vpc_id = aws_vpc.main.id
  name = "rds_sg"
  description = "Grupo de seguranca do banco de dados"

  ingress {
    from_port = 3306
    to_port = 3306
    protocol = "tcp"
    security_groups = [aws_security_group.back_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]

  }
}


#
#
# Banco de dados
#
#

resource "aws_db_subnet_group" "db_subnet_group" {
   subnet_ids = [aws_subnet.private1.id, aws_subnet.private2.id]
   tags = {
     "Name" = "database_sbg"
   }
}

resource "aws_db_instance" "database" {
  allocated_storage    = 10
  db_name              = "mydb"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.medium"
  username             = "terraform"
  password             = "terraform"
  parameter_group_name = "default.mysql8.0"
  skip_final_snapshot  = true
  db_subnet_group_name = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
}



# 
#
#   Computação
#
#

resource "aws_instance" "front-end" {
  ami = "ami-0c7217cdde317cfec"
  vpc_security_group_ids = [aws_security_group.front_sg.id]
  subnet_id = aws_subnet.public.id
  instance_type = var.instance_type
  availability_zone = var.availability_zone
  tags = {
    "Name" = "front-end"
  }
}
resource "aws_instance" "back-end" {
  ami = "ami-0c7217cdde317cfec"
  vpc_security_group_ids = [aws_security_group.back_sg.id]
  subnet_id = aws_subnet.private1.id
  instance_type = var.instance_type
  availability_zone = var.availability_zone
  tags = {
    "Name" = "back-end"
  }
}

#
#
# EBS
#
#
resource "aws_ebs_volume" "Volume" {
  availability_zone = var.availability_zone
  size = 8
  type = "gp3"
  encrypted = true
  tags = {
    "Name" = "Geral"
  }
}
