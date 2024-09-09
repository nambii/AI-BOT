// Deployments API example
// See: https://developer.github.com/v3/repos/deployments/ to learn more

import { sendToAI } from "./chat.js";
import axios from "axios";

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
  // Your code here
  app.log.info("Yay, the app was loaded!");
  app.on(
    ["pull_request.opened", "pull_request.synchronize"],
    async (context) => {
      // Creates a deployment on a pull request event
      // Then sets the deployment status to success
      // NOTE: this example doesn't actually integrate with a cloud
      // provider to deploy your app, it just demos the basic API usage.
      app.log.info(context.payload);

      const repo = context.repo();

      const pullRequest = await context.octokit.issues.get({
        repo: repo.repo,
        owner: repo.owner,
        issue_number: context.pullRequest().pull_number,
      });

      const data = await context.octokit.repos.compareCommits({
        owner: repo.owner,
        repo: repo.repo,
        base: context.payload.pull_request.base.sha,
        head: context.payload.pull_request.head.sha,
      });

      let { files: changedFiles, commits } = data.data;

      if (context.payload.action === "synchronize" && commits.length >= 2) {
        const {
          data: { files },
        } = await context.octokit.repos.compareCommits({
          owner: repo.owner,
          repo: repo.repo,
          base: commits[commits.length - 2].sha,
          head: commits[commits.length - 1].sha,
        });

        const filesNames = files?.map((file) => file.filename) || [];
        changedFiles = changedFiles?.filter((file) =>
          filesNames.includes(file.filename)
        );
      }

      const changes = [];
      for (const file of changedFiles) {
        changes.push(`File: ${file.filename}, Changes: ${file.patch}`);
      }

      const regex = /PD-\d{4}/;
      const issueId = pullRequest.data.title.match(regex);

      const requirements = await getJiraIssueRequirements(issueId);

      const response = await sendToAI({
        requirements,
        code: changes.join("\n"),
      });

      await context.octokit.issues.createComment({
        repo: repo.repo,
        owner: repo.owner,
        issue_number: context.pullRequest().pull_number,
        body: response,
      });
    }
  );

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

async function getJiraIssueRequirements(issueKey) {
  const email = "YOUR_EMAIL";
  const apiToken = 'JIRA_API_TOKEN';
  const jiraInstance = "https://<your instance>.atlassian.net";

  try {
    const response = await axios.get(
      `${jiraInstance}/rest/api/3/issue/${issueKey}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString(
            "base64"
          )}`,
          Accept: "application/json",
        },
      }
    );

    const issueData = response.data;
    const descriptionContent = issueData.fields.description.content;
 
    for(let i = 0; i < descriptionContent.length; i++) {
      if(descriptionContent[i].type === 'heading' && descriptionContent[i].content[0].text.toLowerCase() === 'requirements') {
        let count = 0;
        const requirements = descriptionContent[i + 1].content.map((innerContent) => {
          count += 1;
          return `${count}. ${innerContent.content[0].content[0].text}`;
        })
        return requirements.join('\n');
      }
    }
    // console.log(`Description of Jira Issue ${issueKey}:`, description);
  } catch (error) {
    console.error("Error fetching Jira issue description:", error);
  }
}
