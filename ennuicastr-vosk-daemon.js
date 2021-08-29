#!/usr/bin/env node
/*
 * Copyright (c) 2021 Yahweasel
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

const fs = require("fs");
const net = require("net");

const vosk = require("vosk");

// Set up vosk
vosk.setLogLevel(0);
const model = new vosk.Model("model");

// Set up the server
const server = net.createServer();
const sockPath = "/tmp/ennuicastr-vosk-daemon.sock";
try {
    fs.unlinkSync(sockPath);
} catch (ex) {}
server.listen(sockPath);

// And listen
server.on("connection", sock => {
    // Make a recognizer
    let sampleRate = 48000;
    let rec = new vosk.Recognizer({model, sampleRate});
    rec.setWords(true);

    // Receive data
    let buf = Buffer.alloc(0);
    sock.on("data", chunk => {
        buf = Buffer.concat([buf, chunk]);
        handleData();
    });

    function handleData() {
        while (true) {
            // Commands are line-separated JSON
            let i;
            for (i = 0; i < buf.length && buf[i] !== 10; i++) {}
            if (i === buf.length) break;
            let msg = buf.slice(0, i);
            buf = buf.slice(i + 1);

            try {
                msg = JSON.parse(msg.toString("utf8"));
            } catch (ex) {
                return sock.destroy();
            }

            if (typeof msg !== "object" || msg === null)
                return sock.destroy();

            // Check for reset
            if (msg.c === "reset") {
                rec = new vosk.Recognizer({model, sampleRate});
                rec.setWords(true);
                sock.write('{"result":"ok"}\n');
                continue;
            }

            // Otherwise, the command must be "vosk"
            if (msg.c !== "vosk")
                continue;

            // Get out the data
            let wav;
            try {
                wav = Buffer.from(msg.wav, "base64");
            } catch (ex) {
                return sock.destroy();
            }
            const sr = msg.sr || 48000;

            // Check for sample rate change
            if (sr !== sampleRate) {
                sampleRate = sr;
                rec = new vosk.Recognizer({model, sampleRate});
                rec.setWords(true);
            }

            // Accept it a bit at a time
            let res = [];
            while (wav.length) {
                if (rec.acceptWaveform(wav.subarray(0, 65536)))
                    res = res.concat(rec.result().result);
                wav = wav.slice(65536);
            }
            const fin = rec.finalResult();
            if (fin.result)
                res = res.concat(fin.result);

            // Return the result
            try {
                sock.write(JSON.stringify({result: res}) + "\n");
            } catch (ex) {}
        }
    }
});
