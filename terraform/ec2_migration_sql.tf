resource "aws_instance" "db_migration" {
  ami                         = "ami-0c7217cdde317cfec"
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.private1.id
  vpc_security_group_ids      = [aws_security_group.migration_sg.id]
  associate_public_ip_address = true
  iam_instance_profile = aws_iam_instance_profile.ec2_database_migration_profile.name

  user_data = <<-EOF
    #!/bin/bash
    echo "1. Instalando dependências..."
    apt-get update -y
    apt-get install -y mysql-client awscli

    echo "2. Buscando a senha do banco no SSM..."
    set +x  # desativa echo do bash para não logar a senha
    DB_PASS=$(aws ssm get-parameter \
      --name "/projeto-devops/database/password" \
      --with-decryption \
      --query Parameter.Value \
      --output text \
      --region us-east-1)
    set -x  # reativa echo do bash

    echo "3. Carregando o arquivo init.sql local..."
    cat << 'SQL_SCRIPT' > /tmp/init.sql
    ${file("../db/init.sql")} 
    SQL_SCRIPT

    echo "4. Executando as migrações no RDS..."
    mysql -h ${aws_db_instance.database.address} \
          -u ${var.db_username} \
          -p"$DB_PASS" < /tmp/init.sql

    echo "5. Migração concluída com sucesso! Desligando a máquina..."
    shutdown -h now
  EOF

  tags = {
    Name = "db-migration-runner"
  }
}