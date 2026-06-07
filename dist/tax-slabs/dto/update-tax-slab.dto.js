"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTaxSlabDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_tax_slab_dto_1 = require("./create-tax-slab.dto");
class UpdateTaxSlabDto extends (0, mapped_types_1.PartialType)(create_tax_slab_dto_1.CreateTaxSlabDto) {
}
exports.UpdateTaxSlabDto = UpdateTaxSlabDto;
//# sourceMappingURL=update-tax-slab.dto.js.map