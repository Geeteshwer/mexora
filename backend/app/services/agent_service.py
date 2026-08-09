import json
import uuid

from app.database.database import get_connection


# --------------------------------------------------
# CREATE AGENT
# --------------------------------------------------

def save_agent(agent_id: str, name: str, domain: str, persona: dict = None):
    connection = get_connection()
    cursor = connection.cursor()

    persona_json = json.dumps(persona) if persona else json.dumps({"name": name, "domain": domain})

    cursor.execute(
        """
        INSERT INTO agents (agent_id, name, domain, status, persona)
        VALUES (?, ?, ?, 'ACTIVE', ?)
        """,
        (agent_id, name, domain, persona_json),
    )

    connection.commit()
    connection.close()


# --------------------------------------------------
# GET ALL AGENTS
# --------------------------------------------------

def get_all_agents():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT agent_id, name, domain, status, persona, created_at
        FROM agents
        ORDER BY created_at DESC
        """
    )

    rows = cursor.fetchall()
    connection.close()

    agents = []
    for row in rows:
        persona = {}
        try:
            persona = json.loads(row["persona"]) if row["persona"] else {}
        except (json.JSONDecodeError, TypeError):
            pass

        agents.append({
            "agent_id":   row["agent_id"],
            "name":       row["name"],
            "domain":     row["domain"],
            "status":     row["status"] or "ACTIVE",
            "persona":    persona,
            "created_at": row["created_at"],
        })

    return agents


# --------------------------------------------------
# GET SINGLE AGENT
# --------------------------------------------------

def get_agent(agent_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT agent_id, name, domain, status, persona, created_at
        FROM agents
        WHERE agent_id = ?
        """,
        (agent_id,),
    )

    row = cursor.fetchone()
    connection.close()

    if not row:
        return None

    persona = {}
    try:
        persona = json.loads(row["persona"]) if row["persona"] else {}
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "agent_id":   row["agent_id"],
        "name":       row["name"],
        "domain":     row["domain"],
        "status":     row["status"] or "ACTIVE",
        "persona":    persona,
        "created_at": row["created_at"],
    }


# --------------------------------------------------
# UPDATE AGENT STATUS
# --------------------------------------------------

def update_agent_status(agent_id: str, status: str):
    """status: ACTIVE | PAUSED | ERROR"""
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "UPDATE agents SET status = ? WHERE agent_id = ?",
        (status, agent_id),
    )

    connection.commit()
    connection.close()


# --------------------------------------------------
# DELETE AGENT
# --------------------------------------------------

def delete_agent(agent_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("DELETE FROM agents WHERE agent_id = ?", (agent_id,))

    connection.commit()
    connection.close()