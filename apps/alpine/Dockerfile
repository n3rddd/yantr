FROM alpine:latest

RUN apk add --no-cache openssh sudo bash && \
    ssh-keygen -A && \
    sed -i \
        -e 's/#PasswordAuthentication yes/PasswordAuthentication yes/' \
        -e 's/PasswordAuthentication no/PasswordAuthentication yes/' \
        -e 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' \
        /etc/ssh/sshd_config && \
    echo '%wheel ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 22
ENTRYPOINT ["/entrypoint.sh"]
