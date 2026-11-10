terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

variable "region"  { default = "us-east-1" }
variable "imagen"  { description = "Imagen publica, p. ej. ghcr.io/usuario/clasificaia:latest" }
variable "mi_ip"   { description = "Tu IP publica en formato CIDR, p. ej. 201.10.20.30/32" }

# AMI mas reciente de Amazon Linux 2023
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_security_group" "web" {
  name        = "clasificaia-web"
  description = "HTTP publico, SSH solo desde mi IP"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "SSH solo administrador"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.mi_ip]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]

  metadata_options {
    http_tokens = "required" # IMDSv2
  }
  root_block_device {
    encrypted = true
  }

  user_data = <<-EOT
    #!/bin/bash
    dnf install -y docker
    systemctl enable --now docker
    docker run -d --restart always -p 80:8000 ${var.imagen}
  EOT

  tags = { Name = "clasificaia", Proyecto = "computo-nube" }
}

output "url" {
  value = "http://${aws_instance.app.public_ip}"
}
