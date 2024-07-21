import React, { createContext, useState, useEffect } from 'react';
import Pool from "./UserPool";
import { CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import './Account.css';
import Signup from './Signup';
import Login from './Login';

const AccountContext = createContext();

const Account = (props) => {
    const [isAuthenticated, setAuthentication] = useState(false);
    const [sessionData, setSessionData] = useState(null);


    useEffect(() => {
        getSession().then(session => {
            console.log(session)
            setAuthentication(true);
            setSessionData(session);
        }).catch(() => {
            console.log("user not authenticated")
            setAuthentication(false);
        });
    }, []);

    const getSession = async () => {
        return await new Promise((resolve, reject) => {
            const user = Pool.getCurrentUser();
            if (user) {
                user.getSession((err, session) => {
                    if (err) {
                        reject();
                    } else {
                        resolve(session);
                    }
                });
            } else {
                reject();
            }
        })
    }

    const authenticate = async (Username, Password) => {
        return await new Promise((resolve, reject) => {
            const user = new CognitoUser({ Username, Pool });

            const authDetails = new AuthenticationDetails({ Username, Password });

            user.authenticateUser(authDetails, {
                onSuccess: (data) => {
                    console.log("onSuccess: ", data);
                    setAuthentication(true);
                    setSessionData(data);
                    resolve(data);
                },
                onFailure: (err) => {
                    console.log("onFailure: ", err);
                    reject(err)
                },
                newPasswordRequired: (data) => {
                    console.log("newPasswordRequired: ", data);
                    resolve(data);
                }
            });
        })
    }

    const logout = () => {
        const user = Pool.getCurrentUser();
        if (user) {
            user.signOut();
            setAuthentication(false);
            setSessionData(null);
        }
    };

    return (
        <AccountContext.Provider value={{ authenticate, getSession, logout, sessionData, isAuthenticated }}>
                {isAuthenticated ? (
                    <>
                        {props.children}
                    </>
                ) : (
                    <div id="auth-container">
                      <div id="auth-forms">
                        <Signup />
                        <Login />
                      </div>
                    </div>
                  )}
        </AccountContext.Provider>
    );
};
export {Account, AccountContext};