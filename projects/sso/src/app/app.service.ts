import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders} from '@angular/common/http';

import { Observable } from 'rxjs';
import { AbstractControl, FormGroup } from '@angular/forms';
import { environment } from '../environments/environment';

export interface AuthResponse {
    expiration: number;
    seleneAccess: string;
    seleneRefresh: string;
}

export interface SocialLoginData {
    uuid: string;
    accessToken: string;
    refreshToken: string;
    expiration: string;
}

const internalAuthUrl = '/api/internal-login';
const federatedAuthUrl = '/api/validate-federated';
const logoutUrl = '/api/logout';
const changePasswordUrl = '/api/password-change';
const resetPasswordUrl = '/api/password-reset';
const validateTokenUrl = '/api/validate-token';

export interface FederatedLoginToken {
    platform: string;
    token: string;
}

export interface PasswordChangeAccount {
    accountId: string;
    tokenExpired: boolean;
    tokenInvalid: boolean;
}

export function storeRedirect() {
    localStorage.setItem(
        'redirect',
        decodeURIComponent(window.location.search).slice(10)
    );
}

@Injectable()
export class AppService {

    constructor(private http: HttpClient) { }

    navigateToRedirectURI(delay: number): void {
        let redirectURI = localStorage.getItem('redirect');
        localStorage.removeItem('redirect');
        if (!redirectURI) {
            redirectURI = environment.mycroftUrls.account;
        }
        setTimeout(() => { window.location.assign(redirectURI); }, delay);
    }

    /**
     * Authenticate a user that provides their email address and password as an authentication mechanism
     *
     * For security purposes, encode the raw email address and password using the btoa (binary to ASCII)
     * function so that the raw string values are not included in the request.  Email and password are
     * considered "internal-login" because the authentication data is stored on Mycroft servers.
     *
     * @param loginForm: form containing the email and password of a user not using federated login
     */
    authorizeInternal (loginForm: FormGroup): Observable<AuthResponse> {
        const loginFormValues = loginForm.value;
        const rawCredentials = `${loginFormValues.email}:||:${loginFormValues.password}`;
        const codedCredentials = btoa(rawCredentials);
        const httpHeaders = new HttpHeaders(
            {'Authorization': 'Basic ' + codedCredentials}
        );
        return this.http.get<AuthResponse>(internalAuthUrl, {headers: httpHeaders});
    }

    validateFederatedLogin(loginToken: FederatedLoginToken) {
        return this.http.post<AuthResponse>(federatedAuthUrl, loginToken);
    }

    logout(): Observable<any> {
        return this.http.get(logoutUrl);
    }

    resetPassword(emailAddress: AbstractControl): Observable<any> {
        return this.http.post(resetPasswordUrl, {emailAddress: emailAddress.value});
    }

    validateResetToken(token) {
        return this.http.post<PasswordChangeAccount>(validateTokenUrl, {token: token});
    }

    changePassword(accountId: string, passwordControl: AbstractControl) {
        const codedPassword = btoa(passwordControl.value);
        return this.http.put(changePasswordUrl, {accountId: accountId, password: codedPassword});
    }
}
