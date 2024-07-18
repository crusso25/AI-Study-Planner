import { CognitoUserPool } from "amazon-cognito-identity-js";

const poolData = {
    UserPoolId: "us-east-2_7sEPsRjj0",
    ClientId: "420v8iab2siual8n9gtdf18u3t"
};

export default new CognitoUserPool(poolData);