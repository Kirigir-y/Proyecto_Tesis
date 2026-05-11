FROM postgres:15-alpine

ENV POSTGRES_DB=basedatostesis
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=mistiKa&3690

COPY ./init.sql /docker-entrypoint-initdb.d/
