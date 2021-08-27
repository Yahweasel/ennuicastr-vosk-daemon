This is an absurdly simple Unix domain socket server for
[Vosk](https://alphacephei.com/vosk/). Connect to its socket, and then give
input like so:

```json
{"c":"vosk","wav":"base64 signed 16-bit mono waveform data","sr":sample rate}
```

It will respond like so:

```json
{"result":[vosk result]}
```

`ennuicastr-vosk-daemon.sh` is designed to install all dependencies
automatically, so all you need to do to run the service is run that.
