/**
 * Full reload of the home page. Used after "delete my data": the server has already cleared the session cookie, so the app
 * starts again as a guest and nothing about the deleted person stays in memory. (A client-side navigation is not enough:
 * the sign-in guard of the page we are leaving would redirect to /login first.)
 */
export const leaveApp = () => window.location.assign('/');
