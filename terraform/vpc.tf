resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    "Name" = "Vpc-Estudo"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true
}
resource "aws_subnet" "public2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = var.availability_zone2
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = var.availability_zone
}
resource "aws_subnet" "private2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = var.availability_zone2
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "igw-projeto"
  }
}

resource "aws_eip" "nat_eip" {
  domain = "vpc"
}

// Um NAT por AZ evita que uma falha ou a rota cross-AZ derrube as tasks
// privadas da outra zona.
resource "aws_eip" "nat_eip2" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "nat-gateway-projeto-devops"
  }

  depends_on = [aws_internet_gateway.gw]
}

resource "aws_nat_gateway" "nat2" {
  allocation_id = aws_eip.nat_eip2.id
  subnet_id     = aws_subnet.public2.id

  tags = {
    Name = "nat-gateway-projeto-devops-2"
  }

  depends_on = [aws_internet_gateway.gw]
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
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name = "rt-private"
  }
}

resource "aws_route_table" "private_rt2" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat2.id
  }

  tags = {
    Name = "rt-private-2"
  }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public_rt.id
}
resource "aws_route_table_association" "public2_assoc" {
  subnet_id      = aws_subnet.public2.id
  route_table_id = aws_route_table.public_rt.id
}
resource "aws_route_table_association" "private1_assoc" {
  subnet_id      = aws_subnet.private1.id
  route_table_id = aws_route_table.private_rt.id
}
resource "aws_route_table_association" "private2_assoc" {
  subnet_id      = aws_subnet.private2.id
  route_table_id = aws_route_table.private_rt2.id
}

<<<<<<< HEAD

=======
# Estes endpoints sao o caminho privado para servicos AWS usados durante a
# inicializacao das tasks. Sem eles, uma task em subnet privada precisa de um
# NAT ativo para buscar secrets no SSM e publicar logs no CloudWatch.
>>>>>>> 36b070d9469dc33ec07f5be546db12d4a21e48db
locals {
  interface_endpoint_services = toset([
    "com.amazonaws.us-east-1.logs",
    "com.amazonaws.us-east-1.ssm",
    "com.amazonaws.us-east-1.ssmmessages",
    "com.amazonaws.us-east-1.ec2messages"
  ])
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoint_services

  vpc_id              = aws_vpc.main.id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = [aws_subnet.private1.id, aws_subnet.private2.id]
  security_group_ids  = [aws_security_group.vpc_endpoints_sg.id]

  tags = {
    Name = replace(each.value, "com.amazonaws.us-east-1.", "endpoint-")
  }
}

# Permite trafego bidirecional no Internet Gateway desta VPC, liberando o acesso
# a registros publicos (como Docker Hub) mesmo com o VPC Block Public Access ativo na conta AWS.
resource "aws_vpc_block_public_access_exclusion" "vpc_internet_access" {
  vpc_id                          = aws_vpc.main.id
  internet_gateway_exclusion_mode = "allow-bidirectional"
}

