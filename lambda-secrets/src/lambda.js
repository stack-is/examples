exports.handler = async function(event, context) {
    return {
        secretToken: process.env.SECRET_TOKEN,
        parameter: process.env.PARAMETER,
        anotherParameter: process.env.ANOTHER_PARAMETER
    }
}
