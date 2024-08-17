import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import './Account.css';

const AccountContext = createContext();

const Account = (props) => {
    const [isAuthenticated, setAuthentication] = useState(false);
    const [sessionData, setSessionData] = useState(null);
    const [isLogin, setIsLogin] = useState(true); // Added state for toggling
    const navigate = useNavigate();

    useEffect(() => {
        getSession().then(session => {
            console.log(session);
            setAuthentication(true);
            setSessionData(session);
        }).catch(() => {
            console.log("user not authenticated");
            setAuthentication(false);
        });
    }, []);

    const getSession = async () => {
        const accessToken = localStorage.getItem('accessToken');
        const username = localStorage.getItem('username');
        const userId = localStorage.getItem('userId');
        if (accessToken && username && userId) {
            setAuthentication(true);
            setSessionData({ accessToken, username, userId });
            return { accessToken, username, userId };
        } else {
            throw new Error('No session found');
        }
    };

    const authenticate = async (username, password) => {
        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('username', data.username);
            localStorage.setItem('userId', data.userId);
            setAuthentication(true);
            setSessionData({ accessToken: data.accessToken, username: data.username, userId: data.userId });
            navigate('/');
            return data;
        } catch (error) {
            console.error('Error logging in:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        setAuthentication(false);
        setSessionData(null);
        //navigate('/');
    };

    return (
        <AccountContext.Provider value={{ authenticate, getSession, logout, sessionData, isAuthenticated }}>
            {isAuthenticated ? (
                <>
                    {props.children}
                </>
            ) : (
                <div id="auth-container">
                    <div id="auth-header">
                        <button 
                            className={`auth-toggle-button ${isLogin ? 'active' : ''}`} 
                            onClick={() => setIsLogin(true)}
                        >
                            Login
                        </button>
                        <button 
                            className={`auth-toggle-button ${!isLogin ? 'active' : ''}`} 
                            onClick={() => setIsLogin(false)}
                        >
                            Signup
                        </button>
                    </div>
                    <div id="auth-forms">
                        {isLogin ? <Login /> : <Signup />}
                    </div>
                </div>
            )}
        </AccountContext.Provider>
    );
};

export { Account, AccountContext };
