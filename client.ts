import type {
	LiteralUnion,
	SignInOptions,
	SignInAuthorizationParams,
	SignOutParams,
} from 'next-auth/react'
import type { BuiltInProviderType, RedirectableProviderType } from '@auth/core/providers'

interface AstroSignInOptions extends SignInOptions {
	/** The base path for authentication (default: /api/auth) */
	prefix?: string
}

interface AstroSignOutParams extends SignOutParams {
	/** The base path for authentication (default: /api/auth) */
	prefix?: string
}

/**
 * Client-side method to initiate a signin flow
 * or send the user to the signin page listing all possible providers.
 * Automatically adds the CSRF token to the request.
 *
 * [Documentation](https://authjs.dev/reference/utilities/#signin)
 */
export async function signIn<P extends RedirectableProviderType | undefined = undefined>(
	providerId?: LiteralUnion<
		P extends RedirectableProviderType ? P | BuiltInProviderType : BuiltInProviderType
	>,
	options?: AstroSignInOptions,
	authorizationParams?: SignInAuthorizationParams
) {
	const { callbackUrl = window.location.href, redirect = true } = options ?? {}
	const { prefix = '/api/auth', ...opts } = options ?? {}

	// TODO: Support custom providers
	const isCredentials = providerId === 'credentials'
	const isEmail = providerId === 'email'
	const isSupportingReturn = isCredentials || isEmail

	// TODO: Handle custom base path
	const signInUrl = `${prefix}/${isCredentials ? 'callback' : 'signin'}/${providerId}`

	const _signInUrl = `${signInUrl}?${new URLSearchParams(authorizationParams)}`

	// TODO: Handle custom base path
	const csrfTokenResponse = await fetch(`${prefix}/csrf`)
	const { csrfToken } = await csrfTokenResponse.json()

	const res = await fetch(_signInUrl, {
		method: 'post',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'X-Auth-Return-Redirect': '1',
		},
		// @ts-expect-error -- ignore
		body: new URLSearchParams({
			...opts,
			csrfToken,
			callbackUrl,
		}),
	})

	const data = await res.clone().json();
		// BELOW: added by me
		localStorage.setItem("mydata", JSON.stringify(data)); // this gives an url
		// ABOVE: added by me

	// {"url":"https://github.com/login/oauth/authorize?scope=read%3Auser+user%3Aemail&response_type=code&client_id=Iv23limpol6f4aaELqcq&redirect_uri=http%3A%2F%2Flocalhost%3A4321%2Fapi%2Fauth%2Fcallback%2Fgithub&code_challenge=4oXuFZjpWKbH_rTAthkHcrWLR4P_che8Cj6Nusdd1I8&code_challenge_method=S256"}

	const error = new URL(data.url).searchParams.get('error')


			if (redirect || !isSupportingReturn || !error) {
				// TODO: Do not redirect for Credentials and Email providers by default in next major
				window.location.href = data.url; //?? callbackUrl
				// when not using the callbackUrl, I get something like: http://localhost:4321/api/auth/callback/github?code=65ce038b36ecb40b8559
				// ie, a code query string, in the next GET query
				//TODO: grab the 'code', fetch a token with it, store the token
				// the response header "location" prop contains the code
				// If url contains a hash, the browser does not reload the page. We reload manually
				if (data.url.includes('#')) window.location.reload()
				return  // commented by me
			}


	return res
}

/**
 * Signs the user out, by removing the session cookie.
 * Automatically adds the CSRF token to the request.
 *
 * [Documentation](https://authjs.dev/reference/utilities/#signout)
 */
export async function signOut(options?: AstroSignOutParams) {
	const { callbackUrl = window.location.href, prefix = '/api/auth' } = options ?? {}
	// TODO: Custom base path
	const csrfTokenResponse = await fetch(`${prefix}/csrf`)
	const { csrfToken } = await csrfTokenResponse.json()
	const res = await fetch(`${prefix}/signout`, {
		method: 'post',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'X-Auth-Return-Redirect': '1',
		},
		body: new URLSearchParams({
			csrfToken,
			callbackUrl,
		}),
	})
	const data = await res.json()

	const url = data.url ?? callbackUrl
	window.location.href = url
	// If url contains a hash, the browser does not reload the page. We reload manually
	if (url.includes('#')) window.location.reload()
}
