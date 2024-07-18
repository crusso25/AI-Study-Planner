import React, { useState } from "react";
import UserPool from "./UserPool";
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';

const Signup = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const onSubmit = (event) => {
        event.preventDefault();
        
        const attributeList = [];
        const dataEmail = {
            Name: 'email',
            Value: email
        };
        const attributeEmail = new CognitoUserAttribute(dataEmail);
        attributeList.push(attributeEmail);

        UserPool.signUp(username, password, attributeList, null, (err, data) => {
            if (err) {
                console.log(err);
            } else {
                console.log(data);
            }
        });
    };

    return (
        <form onSubmit={onSubmit}>
            <div className="signup-form">
            <h1>Sign Up</h1>
            <label htmlFor="username">Username: </label>
            <input
                type="text"
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
            />
            <label htmlFor="email">Email: </label>
            <input
                type="email"
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
            />
            <label htmlFor="password">Password: </label>
            <input
                type="text"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
            />
            <button type="submit">Signup</button>
            </div>
        </form>
        
    );
};

export default Signup;