// Split en.json into 6 parts by namespace for parallel zh translation.
const fs = require('fs');
const path = require('path');
const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'i18n', 'en.json'), 'utf8'));

const CHUNKS = {
  p1: ['nav','sync','routes','common','pantry_sheet','trace','editor','cooking_now','recipe','settings','attach_image','login','forgot_password','reset_password','profile','wizard','wizard_ct','diary','foods','smart_log','goals','food_editor','meal_editor','pantry','pantry_editor','diary_entry','accept_invite','two_step','connection_status','watch','password','connect','plain_http','server_signin','when','confirm','notify','migrate','app_ui','login_ui','profile_ui','sidebar_ui','bottom_nav_ui','sidebar_ct','profile_ct','manage_ct'],
  p2: ['settings_added','settings_page','backup_page','settings_import_nt','settings_email_ct','settings_trace_ct','settings_users_ct','settings_kitchens_ct','settings_import_ct','settings_federation_ct','settings_nutrition_ct','settings_auth_extra','settings_api_tokens_ct','settings_webhooks','settings_server_conn','settings_notifications','native_setup_ct','login_ct','updates','settings_ui','settings_auth_ui','settings_backup_ui','settings_email_ui','settings_federation_ui','settings_import_ui','settings_kitchens_ui','settings_import_from_nt_ui'],
  p3: ['settings_server_connection_ui','settings_api_tokens_ui','settings_user_management_ui','settings_appearance_ui','settings_notifications_ui','settings_diagnostics_ui','settings_food_sources_ui','settings_regional_ui','settings_about_ui','settings_cooking_ui','settings_nutrition_ui','settings_trace_ui','manage_cookbooks','manage_units','manage_pantry_cats','manage_recipe_cats','manage_taxonomy','unit_picker_ui','manage_units_ui','manage_cookbooks_ui','manage_ui','manage_pantry_categories_ui','manage_recipe_categories_ui','manage_taxonomy_list_ui','rich_text_editor_ui','markdown_toolbar_ui','image_picker_ct','icon_picker_ct','image_picker_ui','icon_picker_ui','date_picker_ui','date_input_ui','password_strength_meter_ui','wizard_ui','native_setup_ui','time_picker_ct'],
  p4: ['recipes_page','recipe_editor_ct','recipe_view_ct','history','recipes_ui','recipe_view_ui','recipe_editor_ui','cookbook_view_ct','cookbook_view_ui','public_recipe_ct','public_recipe_ui','servings_stepper'],
  p5: ['import_url_dialog','bulk_import_dialog','file_import_dialog','cookbook_import_dialog','import_from_file','file_import_dialog_ui','cookbook_import_dialog_ui','import_url_dialog_ui','bulk_file_import_dialog_ui','import_from_file_dialog_ui','cook_timers','cook_timer_rail','cook_timer_rail_ui','top_timer_pill','top_timer_pill_ui','cook_heatmap','cook_heatmap_ui','barcode_scanner','barcode_scanner_ui','recipe_comments','cook_log_dialog','nutrition_facts','recipe_comments_ui','cook_log_dialog_ui','nutrition_facts_box_ui','nutriments','fail','done','off_share'],
  p6: ['cookdiary_page','build_week','shopping_item','shopping_page','pantry_editor_ct','pantry_page','pantry_sheet_extra','pantry_ui','shopping_ui','cook_diary_ui','pantry_item_sheet_ui','pantry_editor_ui','allergens','diets','allergen_info','household','trace_reply','trace_ai_ct','trace_ui'],
};

const assigned = new Set();
for (const list of Object.values(CHUNKS)) for (const ns of list) assigned.add(ns);
const missing = Object.keys(en).filter(ns => !assigned.has(ns));
const unknown = [...assigned].filter(ns => !(ns in en));
for (const [name, list] of Object.entries(CHUNKS)) {
  const part = {};
  for (const ns of list) if (ns in en) part[ns] = en[ns];
  fs.writeFileSync(path.join(__dirname, `en-${name}.json`), JSON.stringify(part, null, 1), 'utf8');
  const keys = Object.values(part).reduce((a, o) => a + Object.keys(o).length, 0);
  console.log(`${name}: ${list.length} ns, ${keys} keys`);
}
console.log('MISSING (unassigned):', JSON.stringify(missing));
console.log('UNKNOWN (not in en.json):', JSON.stringify(unknown));
