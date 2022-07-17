import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import { throttling } from '@octokit/plugin-throttling';
import { Octokit } from 'octokit';

const ThrottledOctokit = Octokit.plugin(throttling, restEndpointMethods);

export const githubClient = new ThrottledOctokit({
    throttle: {
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        onRateLimit: (retryAfter: number, options: { method: any; url: any; request: { retryCount: any } }) => {
            console.error(`Request quota exhausted for request ${options.method} ${options.url}, number of total global retries: ${options.request.retryCount}`);

            console.log(`Retrying after ${retryAfter} seconds!`);

            return true;
        },
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        onAbuseLimit: (retryAfter: number, options: { method: any; url: any; request: { retryCount: any } }) => {
            console.error(`Abuse detected for request ${options.method} ${options.url}, retry count: ${options.request.retryCount}`);

            console.log(`Retrying after ${retryAfter} seconds!`);

            return true;
        },
    },
});
