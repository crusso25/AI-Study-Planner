import React, { useState, useContext } from "react";
import { AccountContext } from './Account';

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const { authenticate } = useContext(AccountContext);

    const onSubmit = (event) => {
        event.preventDefault();
        
        authenticate(username, password)
        .then(data => {
            console.log("Logged in!", data);
        }).catch(err => {
            console.error("Failed to login", err);
        });
    };

    return (
            <form onSubmit={onSubmit}>
            <div className="login-form">
            <h1>Log In</h1>
                <label htmlFor="username">Username: </label>
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
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
                <button type="submit">Login</button>
                </div>
            </form>
    );
};

export default Login;