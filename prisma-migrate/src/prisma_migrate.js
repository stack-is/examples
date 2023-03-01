function getLogStreamUrl() {
    // These values are specified by the lambda runtime environment: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
    if (process.env?.AWS_LAMBDA_LOG_GROUP_NAME && process.env?.AWS_LAMBDA_LOG_STREAM_NAME && process.env?.AWS_REGION) {
        return `https://${process.env.AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${process.env.AWS_REGION}#logsV2:log-groups/log-group/${encodeURIComponent(process.env.AWS_LAMBDA_LOG_GROUP_NAME)}/log-events/${encodeURIComponent(process.env.AWS_LAMBDA_LOG_STREAM_NAME)}`
    } else {
        return undefined
    }

}

function getDatabaseConnectionStringForPrisma() {
    let url = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
    if (process.env.DB_SCHEMA) {
        url = url + `?schema=${process.env.DB_SCHEMA}`
    }
    return url;
}

function getPrismaErrorCode(e) {
    return e?.code ?? e?.errorCode;
}

async function* iterateAttempts(maxAttempt, intervalMs) {
    for (let attempt = 0; attempt < maxAttempt; attempt++) {
        if (attempt > 0) {
            console.info(`Retrying after ${intervalMs}ms`)
            await sleep(intervalMs);
        }
        yield attempt;
    }
    throw new Error('Maximum attempts reached.')
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function execPrismaMigrate(schema) {
    for await (const attempt of iterateAttempts(5, 5000)) {
        try {
            process.env.DATABASE_URL = getDatabaseConnectionStringForPrisma(true);
            const {Migrate} = require('@prisma/migrate');
            const migrate = new Migrate(schema);
            return await migrate.applyMigrations();
        } catch (e) {
            const code = getPrismaErrorCode(e);
            if (code !== 'P1001') {
                throw e;
            }
            console.error(e);
        }
    }

}

exports.cfn_handler = async function(event, context) {
    const cfn = require('cfn-custom-resource');
    const { configure, sendSuccess, sendFailure, LOG_VERBOSE } = cfn;
    configure({ logLevel: LOG_VERBOSE });

    try {
        const requestType = event.RequestType.toLowerCase()
        if (requestType !== 'delete') {
            await execPrismaMigrate(process.env.PRISMA_SCHEMA_FILE)
        } else {
            console.info('Delete received, not doing anything');
        }
    } catch (error) {
        console.error(error);
        return await sendFailure(`Prisma migration failed. Check cloudwatch:\n${getLogStreamUrl()}`, event);
    }
    return await sendSuccess('migration-function-resource-id', { message: 'Success' } , event);
}
