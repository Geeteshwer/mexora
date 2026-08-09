import json
import os

from dotenv import load_dotenv
from google import genai


# --------------------------------------------------
# ENVIRONMENT
# --------------------------------------------------

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY is not set")


# --------------------------------------------------
# GEMINI CLIENT
# --------------------------------------------------

client = genai.Client(api_key=api_key)

MODEL_NAME = "gemini-3.5-flash"


# --------------------------------------------------
# QUOTA STATE
# --------------------------------------------------

# Once Gemini tells us that the quota is exhausted,
# we stop making Gemini requests for the rest of
# this application run.
GEMINI_QUOTA_EXHAUSTED = False


def is_gemini_available():
    """
    Returns False once Gemini quota has been exhausted or forced to fallback.
    """
    if os.getenv("FORCE_FALLBACK", "false").lower() == "true":
        return False
    return not GEMINI_QUOTA_EXHAUSTED


def evaluate_and_write(persona, articles):

    global GEMINI_QUOTA_EXHAUSTED

    # --------------------------------------------------
    # DO NOT CALL GEMINI IF QUOTA IS ALREADY EXHAUSTED OR FORCED TO FALLBACK
    # --------------------------------------------------

    if GEMINI_QUOTA_EXHAUSTED or os.getenv("FORCE_FALLBACK", "false").lower() == "true":

        print("GEMINI QUOTA EXHAUSTED OR FORCED TO FALLBACK")
        print("No Gemini request will be made.")

        return {
            "publish": False,
            "selected_index": None,
            "score": 0,
            "reason": "Gemini quota is exhausted or forced fallback is active.",
            "post": "",
            "quota_exhausted": True,
        }

    # --------------------------------------------------
    # PREPARE ARTICLES
    # --------------------------------------------------

    articles_text = json.dumps(
        articles,
        indent=2,
        ensure_ascii=False
    )

    # --------------------------------------------------
    # PROMPT
    # --------------------------------------------------

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

    # --------------------------------------------------
    # SINGLE GEMINI REQUEST
    # --------------------------------------------------

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={
                "response_mime_type": "application/json"
            }
        )

        response_text = response.text.strip()

        decision = json.loads(response_text)

        # --------------------------------------------------
        # VALIDATE RESPONSE
        # --------------------------------------------------

        required_fields = [
            "publish",
            "selected_index",
            "score",
            "reason",
            "post"
        ]

        for field in required_fields:

            if field not in decision:
                raise ValueError(
                    f"Missing field in Gemini response: {field}"
                )

        if not isinstance(decision["publish"], bool):

            raise ValueError(
                "Gemini 'publish' must be true or false."
            )

        selected_index = decision["selected_index"]

        if decision["publish"]:

            if not isinstance(selected_index, int):

                raise ValueError(
                    "Gemini selected_index must be an integer."
                )

            if (
                selected_index < 0
                or selected_index >= len(articles)
            ):

                raise ValueError(
                    "Gemini selected_index is outside the article range."
                )

        else:

            decision["selected_index"] = None

        decision["quota_exhausted"] = False

        print("Gemini response successfully parsed.")

        return decision

    # --------------------------------------------------
    # GEMINI ERROR
    # --------------------------------------------------

    except Exception as e:

        error_text = str(e)

        # --------------------------------------------------
        # QUOTA ERROR
        # --------------------------------------------------

        if (
            "429" in error_text
            or "RESOURCE_EXHAUSTED" in error_text
            or "quota" in error_text.lower()
        ):

            GEMINI_QUOTA_EXHAUSTED = True

            print("")
            print("========================================")
            print("GEMINI QUOTA EXHAUSTED")
            print("========================================")
            print("No retry will be performed.")
            print("Gemini calls are now disabled.")
            print("Autonomous cycles will be skipped.")
            print("========================================")
            print("")

            return {
                "publish": False,
                "selected_index": None,
                "score": 0,
                "reason": "Gemini quota exhausted. Future cycles will skip Gemini.",
                "post": "",
                "quota_exhausted": True,
            }

        # --------------------------------------------------
        # OTHER ERROR
        # --------------------------------------------------

        print("Gemini request failed.")
        print(f"Error: {e}")

        return {
            "publish": False,
            "selected_index": None,
            "score": 0,
            "reason": f"Gemini request failed: {e}",
            "post": "",
            "quota_exhausted": False,
        }