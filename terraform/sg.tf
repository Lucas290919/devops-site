resource "aws_security_group" "front_sg" {
  name = "front_sg"
  description = "permite trafego para acesso da web"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port = 443
    to_port = 443
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

resource "aws_security_group" "lb_sg" {
  name = "lb_sg"
  description = "Permite acesso a web para o back-End"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    security_groups = [aws_security_group.front_sg.id ]
  }
  
  egress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    security_groups = [ aws_security_group.back_sg.id ]
  }

  tags = {
    "Name" = "lb_sg"
  }
}

resource "aws_security_group" "back_sg" {
  name = "back_sg"
  description = "Permite acesso a web para o back-End"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port = 3000
    to_port = 3000
    protocol = "tcp"
    security_groups = [ aws_security_group.lb_sg.id ]
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
    security_groups = [aws_security_group.back_sg.id, aws_security_group.migration_sg.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]

  }
}

resource "aws_security_group" "migration_sg" {
  name = "migration-runner-sql"
  vpc_id = aws_vpc.main.id

  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = [ "0.0.0.0/0" ]
  }
}
