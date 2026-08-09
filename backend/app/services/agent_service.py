from app.database.database import get_connection
import uuid


def create_agent_id():
    return str(uuid.uuid4())


def save_agent(agent_id: str, name: str, domain: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO agents (agent_id, name, domain)
        VALUES (?, ?, ?)
        """,
        (agent_id, name, domain),
    )

    connection.commit()
    connection.close()


def get_all_agents():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT agent_id, name, domain
        FROM agents
        """
    )

    agents = cursor.fetchall()

    connection.close()

    return agents