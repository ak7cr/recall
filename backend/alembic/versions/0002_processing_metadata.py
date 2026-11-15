from alembic import op
import sqlalchemy as sa
revision="0002_processing_metadata"
down_revision="0001_initial"
branch_labels=None
depends_on=None
def upgrade():
    with op.batch_alter_table("meetings") as batch:batch.add_column(sa.Column("processing_metadata",sa.JSON(),nullable=True))
def downgrade():
    with op.batch_alter_table("meetings") as batch:batch.drop_column("processing_metadata")
