# setup-tessera

Set up Rust, Tessera, and platform toolchains.

```yaml
- uses: actions/checkout@v4
- uses: tessera-ui/setup-tessera@v1.1.0
```

Defaults to stable Rust, host and Web support, with caching enabled.
Android and iOS are opt-in through `platforms`.
Tessera's own CI should set `tessera-version: workspace`.

Pull request runs restore caches without saving them, so they cannot evict
the default branch caches. Test executables and packaged outputs are pruned
before saving. Jobs that run the same builds can share one cache through
`cache-scope`, with `cache-save: false` on all but one of them.

See [`action.yml`](action.yml) for inputs and defaults.

[MIT](LICENSE). Installed tools retain their own licenses.
