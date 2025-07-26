# Reconhecimento de voz (Kaldi/Vox)

## 🎯 Objetivo
Este projeto permite a transcrição de áudio em tempo real via WebSocket, utilizando o modelo Vosk PT-BR com backend em Python e frontend em React. Ideal para aplicações como assistentes virtuais, legendas automáticas ou sistemas de acessibilidade.

## ⚙️ Tecnologias Utilizadas
- Frontend: React + WebSocket API
- Backend: Python + websockets + Vosk
- Modelo de Transcrição: Vosk PT-BR (offline)
- Áudio: Capturado via MediaRecorder e enviado em chunks
---

## 🚀 Como Executar
- Instale as dependências
```bash
pip install vosk websockets
```


- Baixe o modelo PT-BR
Disponível em Vosk Models
- Execute o servidor WebSocket

# server.py

```python
from vosk import Model, KaldiRecognizer
import websockets, asyncio, wave, json

model = Model("model-ptbr")

async def transcribe(websocket):
    rec = KaldiRecognizer(model, 16000)
    async for message in websocket:
        rec.AcceptWaveform(message)
        result = json.loads(rec.Result())
        await websocket.send(result["text"])

async def main():
    async with websockets.serve(transcribe, "localhost", 8765):
        await asyncio.Future()

asyncio.run(main())
```

- Configure o frontend React para enviar áudio via WebSocket

## 🧠 Como funciona a rede neural Kaldi

O Vosk usa modelos treinados com o Kaldi, um toolkit de reconhecimento de fala que implementa redes neurais profundas com foco em eficiência e modularidade.

## 🔍 Arquitetura Kaldi (nnet3 + chain):
- **Componentes modulares**: Cada camada é um **"componente"** (ex: **ReLU**, **Dropout**, **Affine**).

- **Treinamento otimizado**: Usa **natural gradient SGD** com **model averaging**.

- **Suporte a LSTM, TDNN, CNN:** Flexível para diferentes topologias.

- **Modelo chain:** Maximiza a probabilidade sequencial com menos erros de alinhamento.
Mais detalhes técnicos estão disponíveis na documentação oficial do Kaldi.

## 📊 Comparativo: Vosk vs Whisper vs Google Speech-to-Text

| Modelo       | Offline | Latência | Idiomas | Precisão PT-BR | Custo  | Complexidade |
|--------------|---------|----------|---------|----------------|--------|--------------|
| Vosk         | ✅       | Baixa    | Médio   | Boa            | Grátis | Baixa        |
| Whisper      | ✅       | Média    | Alta    | Excelente      | Grátis | Média        |
| Google STT   | ❌       | Alta     | Alta    | Excelente      | Pago   | Baixa        |


## 🔎 Prós do Vosk:
- Funciona offline
- Leve e rápido
- Fácil de integrar

## ⚠️ Contras:
- Menor cobertura de idiomas
- Menos preciso em áudios ruidosos
