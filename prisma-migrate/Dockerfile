# Just fetch AWS cli and unzip it
FROM node:18-slim AS aws_cli
RUN apt-get update -y \
   && apt-get install -y curl unzip \
   && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
   && unzip -q awscliv2.zip

FROM public.ecr.aws/lambda/nodejs:18 AS lambda_base
COPY --from=aws_cli ./aws /var/aws
RUN /var/aws/install
COPY scripts/ssm-wrapper.sh /
ENV AWS_LAMBDA_EXEC_WRAPPER=/ssm-wrapper.sh

COPY package.json ./
RUN npm install --omit=dev
ARG SOURCE_DIR=/var/task

FROM lambda_base AS release
COPY src ${SOURCE_DIR}
COPY ./migrations /var/prisma/migrations
COPY ./schema.prisma /var/prisma/schema.prisma
ENV PRISMA_SCHEMA_FILE=/var/prisma/schema.prisma

CMD [ "prisma_migrate.cfn_handler" ]
