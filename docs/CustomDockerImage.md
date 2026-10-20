# Eigenes Docker-Image aus einem Fork

Der Compose-Service heißt `fireshare`. Der GHCR-Workflow baut die Lite-Variante mit `Dockerfile.lite`, passend zu deinem Deployment. Wie beim offiziellen Image erhalten die Lite-Tags den Zusatz `-lite`; sie sind damit von einem möglichen Standard-Image im selben Paket unterscheidbar. Lite verwendet das systemeigene FFmpeg und unterstützt kein NVIDIA-NVENC.

## Fork und Release-Tag

Forke Fireshare in deinen GitHub-Account und klone deinen Fork. Erstelle für einen Release einen Versions-Tag im Format `vX.Y.Z`, zum Beispiel:

```sh
git tag v1.9.1
git push origin v1.9.1
```

Der Workflow [ghcr-release.yml](../.github/workflows/ghcr-release.yml) startet beim Push eines solchen Tags. Er baut mit dem Repository-Root als Kontext und `Dockerfile.lite`, damit alle vom Dockerfile benötigten Projektdateien verfügbar sind. `.dockerignore` schließt nur Videodateien und Testvideos aus.

Das Image wird nach `ghcr.io/<GITHUB-OWNER>/fireshare` veröffentlicht. Ein Release-Tag wie `v1.9.1` erzeugt `:1.9.1-lite` und `:latest-lite`. Ein manueller Workflow-Aufruf verlangt einen gültigen und bereits vorhandenen Tag und veröffentlicht nur das versionierte `-lite`-Tag, nie `:latest-lite`.

Die bestehenden Projekt-Workflows verwenden Actions mit Major-Version-Tags (`@vN`); der GHCR-Workflow folgt derselben Konvention. GitHub verwendet `GITHUB_TOKEN` mit `contents: read` und `packages: write`. Das Paket kann in den GHCR-Einstellungen öffentlich oder privat sein.

## Compose auf den Fork umstellen

Ändere in deiner vorhandenen Compose-Datei nur die Image-Referenz. Behalte Service-Name, Ports, Umgebungsvariablen, Volumes und alle weiteren Einstellungen bei:

```yaml
services:
  fireshare:
    image: ghcr.io/<GITHUB-OWNER>/fireshare:1.9.1-lite
```

Ersetze `<GITHUB-OWNER>` durch den GitHub-Benutzernamen oder die Organisation deines Forks und verwende deine gewünschte Version. Für reproduzierbare Updates ist ein Versions-Tag wie `1.9.1-lite` sinnvoll; `latest-lite` folgt dem jeweils neuesten Release-Tag.

Auf dem Server aktualisierst du den bestehenden Service mit:

```sh
docker compose pull fireshare
docker compose up -d fireshare
```

Für ein Rollback setze in der Compose-Datei eine frühere Lite-Image-Version, zum Beispiel `ghcr.io/<GITHUB-OWNER>/fireshare:1.8.0-lite`, und führe dieselben beiden Befehle aus.

Falls das GHCR-Paket privat ist, authentifiziere Docker auf dem Server mit einem GitHub Personal Access Token, das `read:packages` besitzt:

```sh
docker login ghcr.io -u <GITHUB-USERNAME>
```

Gib das Token bei der Passwortabfrage ein und speichere es nicht in der Compose-Datei. Öffentliche Pakete lassen sich ohne Anmeldung beziehen.
