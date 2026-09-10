resource "aws_instance" "db_migration" {
  ami                         = "ami-0c7217cdde317cfec"
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.migration_sg.id]
  associate_public_ip_address = true
  iam_instance_profile = aws_iam_instance_profile.ec2_database_migration_profile.name

  user_data = <<-EOF
    #!/bin/bash
    echo "Atualizando pacotes e instalando MySQL Client..."
    apt-get update -y
    apt-get install -y mysql-client

    echo "Criando o arquivo SQL na maquina..."
    cat << 'SQL_SCRIPT' > /tmp/init.sql
    ${file("../db/init.sql")} 
    SQL_SCRIPT

    echo "Executando o script no RDS..."
    # Conecta no RDS usando as variáveis e executa o arquivo
    mysql -h ${aws_db_instance.database.address} -u ${var.db_username} -p${var.db_password} < /tmp/init.sql

    echo "Migracao concluida! Desligando a maquina para economizar..."
    shutdown -h now
  EOF

  tags = {
    Name = "db-migration-runner"
  }
}