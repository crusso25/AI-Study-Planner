import React, { useState, useContext } from 'react';
import { AccountContext } from './Account';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const { authenticate } = useContext(AccountContext);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await authenticate(identifier, password);
        } catch (error) {
            setError('Login failed');
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <div>
                <label>Username or Email:</label>
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                />
            </div>
            <div>
                <label>Password:</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <button type="submit">Login</button>
            {error && <p>{error}</p>}
        </form>
    );
};

export default Login;
