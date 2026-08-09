import json
import os
import time

from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not set")

client = genai.Client(api_key=api_key)

MODEL_NAME = "gemini-3.5-flash"


def evaluate_and_write(persona, articles):

    articles_text = json.dumps(
        articles,
        indent=2,
        ensure_ascii=False
    )

    prompt = f"""
You are {persona["name"]}, an autonomous AI and technology persona.

Your domain is:
{persona["domain"]}

You operate as an independent technology editor.

Evaluate these candidate stories:

{articles_text}

EDITORIAL STANDARDS:

1. The story must be relevant to AI or technology.
2. Prefer technically meaningful developments.
3. Prefer genuinely current and important developments.
4. Prefer stories that provide insight to a technical audience.
5. Avoid repetitive topics.
6. Avoid marketing-style promotional content.
7. Stay aligned with the persona's domain.
8. You may reject ALL candidates if none deserve publication.

Choose at most ONE story.

Return ONLY valid JSON:

{{
    "publish": true,
    "selected_index": 0,
    "score": 85,
    "reason": "Explain why this story deserves publication and why it is stronger than the alternatives.",
    "post": "Write the final post in the persona's voice."
}}

If none deserve publication:

{{
    "publish": false,
    "selected_index": null,
    "score": 0,
    "reason": "Explain why the candidates were rejected.",
    "post": ""
}}

WRITING STYLE:

- Sound like a knowledgeable human technology professional.
- Do not say you are an AI.
- Do not use generic hype.
- Do not start every post with the same phrase.
- Focus on technological significance.
- Be concise but insightful.
- Do not invent facts.
"""

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config={
                    "response_mime_type": "application/json"
                }
            )

            return json.loads(response.text)

        except Exception as e:
            error_text = str(e)

            print(
                f"Gemini attempt {attempt + 1}/3 failed: {error_text}"
            )

            if attempt < 2:
                time.sleep(5)

    print("Gemini unavailable after 3 attempts. Skipping cycle.")

    return {
        "publish": False,
        "selected_index": None,
        "score": 0,
        "reason": "Gemini was temporarily unavailable. Cycle skipped safely.",
        "post": ""
    }