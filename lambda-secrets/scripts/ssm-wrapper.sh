#! /usr/bin/env bash
PREFIX="SSM_"
for entry in $(printenv | grep "^${PREFIX}"); do
  ENV_NAME_WITH_PREFIX="$(cut -d'=' -f1 <<<"${entry}")"
  ENV_NAME="$(cut -c $((${#PREFIX} + 1))- <<<"${ENV_NAME_WITH_PREFIX}")"
  PARAMETER_STORE_PATH="$(cut -d'=' -f2 <<<"${entry}")"
  echo "Fetching: ${PARAMETER_STORE_PATH} from parameter store and assigning it to ${ENV_NAME}"
  ENV_VALUE=$(aws ssm get-parameter --name "${PARAMETER_STORE_PATH}" --with-decryption --query Parameter.Value --output text)
  ssmExitCode=$?
  if [ $ssmExitCode -ne 0 ]; then
    echo "Error fetching from SSM parameter store, path: '${PARAMETER_STORE_PATH}'"
  else
    export "${ENV_NAME}=${ENV_VALUE}"
  fi
done
exec "$@"
