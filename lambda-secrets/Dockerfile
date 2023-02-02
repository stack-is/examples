FROM public.ecr.aws/lambda/nodejs:18
RUN yum install -y curl unzip \
   && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
   && unzip -q awscliv2.zip \
   && rm awscliv2.zip \
   && ./aws/install  \
   && aws --version

COPY ./scripts/ssm-wrapper.sh /ssm-wrapper.sh
ENV AWS_LAMBDA_EXEC_WRAPPER=/ssm-wrapper.sh

# Application code
COPY src /var/task

CMD [ "lambda.handler" ]

