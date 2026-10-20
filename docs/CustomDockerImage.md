# Eigenes Docker-Image aus einem Fork

Der Compose-Service in diesem Repository heißt `fireshare` und verwendet das Standard-Image aus `Dockerfile`. Die Compose-Datei im Repository referenziert `shaneisrael/fireshare:latest`; das README-Installationsbeispiel verwendet hingegen die Lite-Variante. Der GHCR-Workflow baut zunächst das Standard-Image, passend zur Compose-Datei. Es enthält den CUDA-basierten FFmpeg-Build und unterstützt NVIDIA-NVENC, wenn der Host entsprechend eingerichtet ist.

## Fork und Release-Tag

Forke Fireshare in deinen GitHub-Account und klone deinen Fork. Erstelle für einen Release einen Versions-Tag im Format `vX.Y.Z`, zum Beispiel:

```sh
git tag v1.9.0
git push origin v1.9.0
```

Der Workflow [ghcr-release.yml](../.github/workflows/ghcr-release.yml) startet beim Push eines solchen Tags. Er baut mit dem Repository-Root als Kontext und `Dockerfile`, damit alle vom Dockerfile benötigten Projektdateien verfügbar sind. `.dockerignore` schließt nur Videodateien und Testvideos aus.

Das Image wird nach `ghcr.io/<GITHUB-OWNER>/fireshare` veröffentlicht. Ein Release-Tag wie `v1.9.0` erzeugt `:1.9.0` und `:latest`. Ein manueller Workflow-Aufruf verlangt einen gültigen und bereits vorhandenen Tag und veröffentlicht nur das versionierte Tag, nie `:latest`.

Die bestehenden Projekt-Workflows verwenden Actions mit Major-Version-Tags (`@vN`); der GHCR-Workflow folgt derselben Konvention. GitHub verwendet `GITHUB_TOKEN` mit `contents: read` und `packages: write`. Das Paket kann in den GHCR-Einstellungen öffentlich oder privat sein.

## Compose auf den Fork umstellen

Ändere in deiner vorhandenen Compose-Datei nur die Image-Referenz. Behalte Service-Name, Ports, Umgebungsvariablen, Volumes und alle weiteren Einstellungen bei:

```yaml
services:
  fireshare:
    image: ghcr.io/<GITHUB-OWNER>/fireshare:1.9.0
```

Ersetze `<GITHUB-OWNER>` durch den GitHub-Benutzernamen oder die Organisation deines Forks und verwende deine gewünschte Version. Für reproduzierbare Updates ist ein Versions-Tag wie `1.9.0` sinnvoll; `latest` folgt dem jeweils neuesten Release-Tag.

Auf dem Server aktualisierst du den bestehenden Service mit:

```sh
docker compose pull fireshare
docker compose up -d fireshare
```

Für ein Rollback setze in der Compose-Datei eine frühere Image-Version, zum Beispiel `ghcr.io/<GITHUB-OWNER>/fireshare:1.8.0`, und führe dieselben beiden Befehle aus.

Falls das GHCR-Paket privat ist, authentifiziere Docker auf dem Server mit einem GitHub Personal Access Token, das `read:packages` besitzt:

```sh
docker login ghcr.io -u <GITHUB-USERNAME>
```

Gib das Token bei der Passwortabfrage ein und speichere es nicht in der Compose-Datei. Öffentliche Pakete lassen sich ohne Anmeldung beziehen.
