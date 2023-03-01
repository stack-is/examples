# AWS Lambda to execute prisma migrations in your private VPC

## Running this example
### Prerequisites
You should have a VPC that contains an RDS instance/cluster running a postgres compatible database.
Ideally your RDS be in a private subnet but it would probably be best if you could connect to the database in some way just to get feedback of this example e.g. with the RDS Data API, VPN or tunnel through a bastion instance. 
You can use the other examples in this repository `serverless-aurora` and `vpc` to get started. 
** Note the subnet IDs that contain the RDS instance/cluster and a security group ID which has access to the RDS instance. 

### Step 1: Create a private ECR repository
You can do this from the CLI:
```bash
aws ecr create-repository \
    --repository-name "examples/prisma-migrate" \
    --image-scanning-configuration scanOnPush=true \
    --region <region> \
    --query repository.repositoryUri 
    --output text
```
*Note down the repository URI for the next step*

### Step 2: Build and push
Build and push this image to the newly created ECR repository.

```shell
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker build --tag examples/prisma-migrate:v1 .
docker tag examples/prisma-migrate:v1 <account-id>.dkr.ecr.<region>.amazonaws.com/examples/prisma-migrate:v1
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/examples/prisma-migrate:v1
```
*Note the full repository image and version tag here for step 6*

`
<account-id>.dkr.ecr.<region>.amazonaws.com/examples/prisma-migrate:v1
`
### Step 3: Database Connection Details
Note down the connection details to your database:
* `SsmDatabaseUsername`: The username to login with stored in SSM Parameter store
* `SsmDatabasePassword`: The password to login with stored in SSM Parameter store as a `SecureString`
* `DatabaseName`: Name of the database
* `DatabaseHost`
* `DatabasePort`
* `DatabaseSecurityGroupId`: A security group ID which has rules that allow connections over the specified database port.
* `DatabaseSubnets`: A list of subnet IDs where the database is hosted in. 

Also for permissions to decrypt the SSM Parameter store secrets, our function needs permissions to use the KMS key used. So note down the ARN of that key (`KmsSsmArn`). 
Most likely you have used the default KMS key so you should be able to run:
```bash
aws kms describe-key \
  --key-id "alias/aws/ssm" \
  --query KeyMetadata.Arn \
  --output text
```

### Step 4: Deploy the Cloudformation template
```bash
aws cloudformation deploy \
  --template-file template.cfn.yml \
  --stack-name prisma-migrate \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    "ImageUri=<account-id>.dkr.ecr.<region>.amazonaws.com/examples/prisma-migrate:v1" \
    "KmsSsmArn=arn:aws:kms:<region>:<account-id>:key/<key-id>" \
    "SsmDatabaseUsername=/db/username:1" \
    "SsmDatabasePassword=/db/password:1" \
    "DatabaseName=postgres" \
    "DatabaseHost=example-database-1234abcd12ef.cluster-ghijk12345l6.<region>.rds.amazonaws.com" \
    "DatabasePort=5432" \
    "DatabaseSecurityGroupId=sg-0a0123456abcd0123" \
    "DatabaseSubnets=subnet-0a123456789890890,subnet-0b123456789890890,subnet-0c123456789890890"
```
