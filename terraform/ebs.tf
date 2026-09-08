resource "aws_ebs_volume" "Volume" {
  availability_zone = var.availability_zone
  size = 30
  type = "gp3"
  encrypted = true
  
  tags = {
    "Name" = "Geral"
  }
}