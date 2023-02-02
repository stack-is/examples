# SSM Parameter Store Wrapper for AWS Lambda Functions

## Running this example

### Step 1: Create a private ECR repository
You can do this from the CLI:
```bash
aws ecr create-repository \
    --repository-name "examples/ssm-wrapper" \
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
docker build --tag examples/ssm-wrapper:latest .
docker tag examples/ssm-wrapper:latest <account-id>.dkr.ecr.<region>.amazonaws.com/examples/ssm-wrapper:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/examples/ssm-wrapper:latest
```
*Note the full repository image and version tag here for step 6*

`
<account-id>.dkr.ecr.<region>.amazonaws.com/examples/ssm-wrapper:latest
`
### Step 4: Create some SSM Parameter store values
Here we just create two types of parameters, regular string and secure string. Note that this will use the default KMS key to encrypt the secure string. 
```shell
aws ssm put-parameter \
  --name "/examples/token" \
  --type SecureString \
  --value "secret-password"

aws ssm put-parameter \
  --name "/examples/parameter" \
  --type String \
  --value "flawless-flapjack"
```

### Step 5: Fetch the ARN of the default KMS key
```bash
aws kms describe-key \
  --key-id "alias/aws/ssm" \
  --query KeyMetadata.Arn \
  --output text
```
### Step 6: Deploy the Cloudformation template
```bash
aws cloudformation deploy \
  --template-file template.cfn.yml \
  --stack-name ssm-wrapper \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    "ImageUri=<account-id>.dkr.ecr.<region>.amazonaws.com/examples/ssm-wrapper:latest" \
    "SsmKmsArn=arn:aws:kms:<region>:<account-id>:key/<key-id>"
```


### Step 7: Test your function
```bash
aws lambda invoke --function-name lambda-ssm-wrapper out.json
```
Expected output:
```json
{
  "secretToken": "secret-password",
  "parameter": "flawless-flapjack",
  "anotherParameter": "happy-hamburgers"
}
```