import os
import time
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "carecue-sessions")

class SessionStore:
    """Manages CareCue session metadata in DynamoDB with in-memory local fallback."""
    _shared_cache: Dict[str, Dict[str, Any]] = {}

    def __init__(self, table_name: Optional[str] = None):
        self.table_name = table_name or DEFAULT_TABLE_NAME
        self.region_name = os.environ.get("AWS_REGION", "us-east-1")
        self._table = None
        self._local_cache = SessionStore._shared_cache

    def _get_table(self):
        if self._table is None:
            import boto3
            dynamodb = boto3.resource("dynamodb", region_name=self.region_name)
            self._table = dynamodb.Table(self.table_name)
        return self._table

    def create_session(
        self,
        session_id: str,
        session_type: str = "report",
        title: Optional[str] = None,
        document_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        item = {
            "sessionId": session_id,
            "sessionType": session_type,
            "type": session_type,
            "title": title or "Lab Report",
            "documentName": document_name,
            "status": "created",
            "verificationStatus": "pending",
            "overallConfidence": 0,
            "findings": [],
            "createdAt": now,
            "updatedAt": now,
            # TTL for cost safety (30 days from now in epoch seconds)
            "ttl": int(time.time()) + (30 * 86400),
        }

        try:
            table = self._get_table()
            table.put_item(Item=item)
        except Exception as e:
            logger.warning(f"DynamoDB put_item unavailable ({e}); saving to in-memory store.")
            self._local_cache[session_id] = item

        return item

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            table = self._get_table()
            res = table.get_item(Key={"sessionId": session_id})
            return res.get("Item")
        except Exception as e:
            logger.warning(f"DynamoDB get_item unavailable ({e}); reading from in-memory store.")
            return self._local_cache.get(session_id)

    def list_sessions(self) -> List[Dict[str, Any]]:
        try:
            table = self._get_table()
            res = table.scan(Limit=50)
            return res.get("Items", [])
        except Exception as e:
            logger.warning(f"DynamoDB scan unavailable ({e}); reading from in-memory store.")
            return list(self._local_cache.values())

    def update_session(self, session_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        existing = self.get_session(session_id) or {
            "sessionId": session_id,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

        existing.update(updates)
        existing["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        try:
            table = self._get_table()
            table.put_item(Item=existing)
        except Exception as e:
            logger.warning(f"DynamoDB update unavailable ({e}); updating in-memory store.")
            self._local_cache[session_id] = existing

        return existing

    def update_session_analysis(
        self,
        session_id: str,
        findings: List[Dict[str, Any]],
        verification_status: str,
        overall_confidence: int,
        pii_entity_count: int = 0,
    ) -> Dict[str, Any]:
        return self.update_session(session_id, {
            "findings": findings,
            "verificationStatus": verification_status,
            "overallConfidence": overall_confidence,
            "piiRedactedCount": pii_entity_count,
            "status": "analyzed",
        })

    def update_session_brief(self, session_id: str, brief_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.update_session(session_id, {
            "doctorBrief": brief_data,
            "hasDoctorBrief": True,
        })

    def delete_session(self, session_id: str) -> bool:
        try:
            table = self._get_table()
            table.delete_item(Key={"sessionId": session_id})
        except Exception as e:
            logger.warning(f"DynamoDB delete unavailable ({e}); removing from in-memory store.")
            self._local_cache.pop(session_id, None)

        return True
