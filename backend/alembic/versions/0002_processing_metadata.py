from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa
revision="0002_processing_metadata"
down_revision="0001_initial"
branch_labels=None
depends_on=None
def upgrade():
    if "processing_metadata" not in {c["name"] for c in inspect(op.get_bind()).get_columns("meetings")}:
        with op.batch_alter_table("meetings") as batch:batch.add_column(sa.Column("processing_metadata",sa.JSON(),nullable=True))
def downgrade():
    if "processing_metadata" in {c["name"] for c in inspect(op.get_bind()).get_columns("meetings")}:
        with op.batch_alter_table("meetings") as batch:batch.drop_column("processing_metadata")
