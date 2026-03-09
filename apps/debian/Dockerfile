FROM debian:stable-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq && \
    apt-get install -y -qq openssh-server sudo && \
    mkdir -p /run/sshd && \
    ssh-keygen -A && \
    sed -i \
        -e 's/#PasswordAuthentication yes/PasswordAuthentication yes/' \
        -e 's/PasswordAuthentication no/PasswordAuthentication yes/' \
        -e 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' \
        -e 's/UsePAM yes/UsePAM no/' \
        /etc/ssh/sshd_config && \
    echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22
ENTRYPOINT ["/entrypoint.sh"]
