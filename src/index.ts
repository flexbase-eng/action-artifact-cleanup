import * as core from '@actions/core';
import { githubClient } from './client';
import { DateTime } from 'luxon';

interface RepoArtifact {
    id: number;
    repo: string;
    name: string;
    size: number;
    created: DateTime;
    expires: DateTime;
    updated: DateTime;
}

const OWNER = 'flexbase-eng';

async function run(): Promise<void> {
    try {
        const repoNames = await githubClient.paginate(githubClient.rest.repos.listForOrg, { org: OWNER, per_page: 100, sort: 'updated', type: 'all' }, response => response.data.map(x => x.name));

        repoNames.forEach(x => core.debug(x));

        core.info(`${repoNames.length} repos to evaluate`);

        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        const artifacts: any = {};

        for (const repo of repoNames) {
            const actionArtifacts = await githubClient.paginate(githubClient.rest.actions.listArtifactsForRepo, { owner: OWNER, repo: repo, per_page: 100 });

            const repoArtifacts: RepoArtifact[] = [];

            actionArtifacts.forEach(x =>
                repoArtifacts.push({
                    id: x.id,
                    repo,
                    name: x.name,
                    size: x.size_in_bytes,
                    created: DateTime.fromISO(x.created_at ?? '1970-01-01T00:00:00Z'),
                    expires: DateTime.fromISO(x.expires_at ?? '1970-01-01T00:00:00Z'),
                    updated: DateTime.fromISO(x.updated_at ?? '1970-01-01T00:00:00Z'),
                })
            );

            artifacts[repo] = repoArtifacts;
        }

        // console.log(artifacts);

        let totalBytes = 0;

        for (const kvp of Object.entries<RepoArtifact[]>(artifacts)) {
            kvp[1].sort((a, b) => (a.updated > b.updated ? -1 : a.updated < b.updated ? 1 : 0));

            // console.log(`${kvp[0]} order`);

            // kvp[1].forEach(x => console.log(`${x.id} ${x.name} ${x.size} ${x.updated.toISODate()}`));

            const toDelete = kvp[1].slice(5);

            // console.log();
            // console.log(`${kvp[0]} to delete`);
            // toDelete.forEach(x => console.log(`${x.id} ${x.name} ${x.size} ${x.updated.toISODate()}`));

            // console.log();
            // console.log();

            let bytes = 0;

            toDelete.forEach(async x => {
                const response = await githubClient.rest.actions.deleteArtifact({ owner: OWNER, repo: x.repo, artifact_id: x.id });
                if (response.status !== 204) {
                    core.warning(`Unable to delete artifact ${x.id} from ${x.repo}`);
                } else {
                    bytes = bytes + x.size;
                    totalBytes = totalBytes + x.size;
                }
            });

            core.info(`${kvp[0]} reclaimed ${bytes} in space`);
        }

        core.info(`Total bytes reclaimed: ${totalBytes}`);
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message);
    }
}

run();
