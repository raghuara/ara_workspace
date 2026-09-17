const { withTransaction } = require("../utils/transaction");
const { departmentModel, designationModel } = require("../models/catalog.model");
const workspaceModel = require("../models/workspace.model");
const { USER_TYPE } = require("../constants/workspace");

const text = (value) => (typeof value === "string" ? value.trim() : "");

const canUseWorkspace = async (req, workspaceId) => {
  if (!workspaceId || !(await workspaceModel.findWorkspaceById(workspaceId))) return false;
  if (req.user.userTypeId === USER_TYPE.MASTER_ADMIN) return true;
  return workspaceModel.isMember(workspaceId, req.user.employeeId);
};

const createCatalogController = ({ model, singular, maxNameLength }) => {
  const map = (row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? "",
    isActive: Boolean(row.is_active),
    employeeCount: row.employee_count
  });

  const notFound = (res) => res.status(404).json({ message: `That ${singular} does not exist.`, code: "NOT_FOUND" });
  const forbidden = (res) => res.status(403).json({ message: "You do not have access to that workspace.", code: "FORBIDDEN" });

  const duplicate = (res) =>
    res.status(409).json({
      message: `A ${singular} with this name already exists in this workspace.`,
      code: "DUPLICATE_NAME",
      errors: { name: "This name is already in use." }
    });

  const nameRequired = (res) =>
    res.status(400).json({
      message: "Please fix the highlighted fields.",
      code: "VALIDATION_ERROR",
      errors: { name: `${singular[0].toUpperCase()}${singular.slice(1)} name is required.` }
    });

  const list = async (req, res) => {
    const workspaceId = text(req.query.workspaceId);
    if (!workspaceId) {
      return res.status(400).json({ message: "workspaceId is required.", code: "BAD_REQUEST" });
    }
    if (!(await canUseWorkspace(req, workspaceId))) return forbidden(res);

    const rows = await model.findAll(workspaceId);
    const activeOnly = req.query.active === "true";
    res.json(rows.filter((row) => !activeOnly || row.is_active).map(map));
  };

  const create = async (req, res) => {
    const workspaceId = text(req.body.workspaceId);
    if (!(await canUseWorkspace(req, workspaceId))) return forbidden(res);

    const name = text(req.body.name).slice(0, maxNameLength);
    if (!name) return nameRequired(res);

    try {
      const id = await model.insert({
        workspaceId,
        name,
        description: text(req.body.description).slice(0, 255) || null,
        isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive)
      });
      return res.status(201).json(map(await model.findById(id)));
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return duplicate(res);
      throw error;
    }
  };

  const update = async (req, res) => {
    const existing = await model.findById(req.params.id);
    if (!existing) return notFound(res);
    if (!(await canUseWorkspace(req, existing.workspace_id))) return forbidden(res);

    const name = req.body.name === undefined ? existing.name : text(req.body.name).slice(0, maxNameLength);
    if (!name) return nameRequired(res);

    const data = {
      name,
      description: req.body.description === undefined ? existing.description : text(req.body.description).slice(0, 255) || null,
      isActive: req.body.isActive === undefined ? Boolean(existing.is_active) : Boolean(req.body.isActive)
    };

    try {
      await withTransaction(async (connection) => {
        await model.update(existing.id, data, connection);
        if (name !== existing.name) await model.renameOnEmployees(existing.workspace_id, existing.name, name, connection);
      });
      return res.json(map(await model.findById(existing.id)));
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return duplicate(res);
      throw error;
    }
  };

  const remove = async (req, res) => {
    const existing = await model.findById(req.params.id);
    if (!existing) return notFound(res);
    if (!(await canUseWorkspace(req, existing.workspace_id))) return forbidden(res);

    if (existing.employee_count > 0) {
      return res.status(400).json({
        message: `${existing.employee_count} employee(s) have this ${singular}. Move them first, or mark it inactive instead.`,
        code: "BAD_REQUEST"
      });
    }

    await model.remove(existing.id);
    res.json({ id: existing.id });
  };

  return { list, create, update, remove };
};

module.exports = {
  departmentController: createCatalogController({ model: departmentModel, singular: "department", maxNameLength: 80 }),
  designationController: createCatalogController({ model: designationModel, singular: "designation", maxNameLength: 100 })
};
