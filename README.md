# [Krew Index Tracker][1]

[![License](https://img.shields.io/github/license/predatorray/krew-index-tracker)][2]
[![Build Status](https://img.shields.io/github/actions/workflow/status/predatorray/krew-index-tracker/ci.yml?branch=main)][3]

Krew Index Tracker is a tool that monitors and tracks the download statistics of Krew plugins.

It is [available on GitHub Pages][1].

## How it works

1. [A GitHub workflow][4] is triggered at 00:00 UTC every day.
2. It lists all the available plugins from Krew and fetches the download count of each of them using GitHub Release API.
3. Then, it generates JSON files containing the download stats and creates an auto-approved pull request.
4. Finally, after all the required checks pass and pull request is auto-merged, [another GitHub Workflow][5] publishes it to GitHub Pages.

## Screenshot

![screenshot](https://github.com/predatorray/krew-index-tracker/blob/assets/screenshot.png?raw=true)

## Support & Bug Report

If you find any bugs or have suggestions, please feel free to [open an issue][6].

## License

This project is licensed under the [MIT License][2].


[1]: https://predatorray.github.io/krew-index-tracker/
[2]: https://github.com/predatorray/krew-index-tracker/blob/main/LICENSE
[3]: https://github.com/predatorray/krew-index-tracker/actions/workflows/ci.yml
[4]: https://github.com/predatorray/krew-index-tracker/actions/workflows/fetch-download-stats.yml
[5]: https://github.com/predatorray/krew-index-tracker/actions/workflows/deploy.yml
[6]: https://github.com/predatorray/krew-index-tracker/issues/new
