
**Note**: This repo has node_modules checked in as that is, believe it or not, best practice for [github actions](https://docs.github.com/en/free-pro-team@latest/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github)

# Run notebook

This is based on [yaananth/run-notebook](https://www.github.com/yaananth/run-notebook).

## Usage

This github action executes a set of jupyter notebooks and lets you upload produced output as artifact using [upload artifact action](https://github.com/marketplace/actions/upload-artifact), or commit it to the github repo using [github-push-action](https://github.com/marketplace/actions/github-push)


**Note**: This action produces output to a directory called `nb-runner` under runner's temp directory.

### Example 1 - executing notebook with parameters
```yaml
name: Execute notebook

on: [push]

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - name: Set up Python
      uses: actions/setup-python@v1
    - uses: glg/run-notebook-action@v1
      env:
        MY_ENV_VAR: "env var value"
        MY_SECRET_ENV_VAR: ${{ secrets.MY_SECRET_ENV_VAR }}
      with:
        temp_dir: "${{ runner.temp }}"
        workspace: "${{ github.workspace }}"
        notebooks: "*.ipynb"
        isReport: False
    # To attach the output as an artifact to workflow run
    - uses: actions/upload-artifact@master
      if: always()
      with:
        name: output
        path: ${{ RUNNER.temp }}/nb-runner
      env:
        RUNNER: ${{ toJson(runner) }}
    # Alternately, to commit the output to the repo
    - name: move to dir # Move the generated files into output folder
      run: |
        mkdir -p output
        cp -rf ${{ runner.temp }}/nb-runner/*.ipynb ./output/
    - name: Commit files
      run: |
        git config --local user.email "arbitrary_email_address@arbitrary_domain.com"
        git config --local user.name "Notebook Runner"
        git add -f ./output
        git commit -m "Publishing updated notebooks"
    - name: Push changes
      uses: ad-m/github-push-action@master
      with:
        branch: branch-name #ignore if your branch is master
        github_token: ${{ secrets.GITHUB_TOKEN }}
        force: false

```

## Parameters
- `temp_dir`: this is the working dir.  Best practice is to use an environment variable - it should be set to `${{ runner.temp }}`
- `workspace`: this is the github workspace. Best practice is to use an environment variable -  it should be set to `${{ github.workspace }}`
- `notebooks`: glob pattern for notebook files to process (implemented via [node-glob](https://github.com/isaacs/node-glob))
- `isReport`: If True, will hide inputs in notebook.

## env vars
All environment variables specified in the `env` block will be available in the notebook environment.  Any github secrets you wish to use in the notebook should be declared as env vars:
```
  env:
    MY_GITHUB_SECRET: ${{ secrets.MY_GITHUB_SECRET }}
```
