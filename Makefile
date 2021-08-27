MODEL=en-us-0.20

all: node_modules model

node_modules:
	npm install

model: vosk-model-$(MODEL).zip
	unzip vosk-model-$(MODEL).zip
	mv vosk-model-$(MODEL) model
	touch model

vosk-model-$(MODEL).zip:
	curl -L http://alphacephei.com/vosk/models/vosk-model-$(MODEL).zip -o $@
