package ch.utou.confluence.plugins.tiddlywiki.macros;

import java.util.*;
import com.atlassian.renderer.RenderContext;
import com.atlassian.renderer.v2.RenderMode;
import com.atlassian.renderer.v2.macro.BaseMacro;
import com.atlassian.renderer.v2.macro.MacroException;
import com.atlassian.confluence.util.velocity.VelocityUtils;
import com.atlassian.confluence.renderer.PageContext;
import com.atlassian.confluence.renderer.radeox.macros.MacroUtils;
import com.opensymphony.webwork.ServletActionContext;
import com.atlassian.confluence.spaces.Space;
import com.atlassian.confluence.spaces.SpaceManager;
import com.atlassian.confluence.core.ConfluenceActionSupport;
import com.atlassian.confluence.util.GeneralUtil;

/**
 * Macro to provide a space export form for TiddlyWiki
 *
 */
public class TiddlyWikiMacro extends BaseMacro {

	private SpaceManager spaceManager;
	private ConfluenceActionSupport confluenceActionSupport;
	
	public void setSpaceManager(SpaceManager spaceManager) {
		this.spaceManager = spaceManager;
	}
	
	public boolean isInline() {
		return false;
	}

	public boolean hasBody() {
		return false;
	}

	public RenderMode getBodyRenderMode() {
		return RenderMode.NO_RENDER;
	}

	public String execute(Map parameters, String body,
			RenderContext renderContext) throws MacroException {
		
		// Default context
		Map contextMap = MacroUtils.defaultVelocityContext();
		
		String spaceKey = "";
		if (parameters.containsKey("space"))
			spaceKey = (String) parameters.get("space");
		else if (renderContext instanceof PageContext)
			spaceKey = ((PageContext) renderContext).getSpaceKey();

		if (spaceKey != "")
			contextMap.put("spaceKey", spaceKey);
		
		if (parameters.containsKey("title"))
			contextMap.put("linkTitle", parameters.get("title"));
		else
			contextMap.put("linkTitle", getText("tiddlywiki.macro.title"));
		
		if (parameters.containsKey("page"))
			contextMap.put("startPage", parameters.get("page"));
		
		// Render Velocity template
		return VelocityUtils.getRenderedTemplate(
				"/templates/macros/tiddlymacro.vm",
				contextMap);
	}

	public void setConfluenceActionSupport(ConfluenceActionSupport confluenceActionSupport) {
		this.confluenceActionSupport = confluenceActionSupport;
	}
	
	protected ConfluenceActionSupport getConfluenceActionSupport() {
        if (null == confluenceActionSupport)
            confluenceActionSupport = GeneralUtil.newWiredConfluenceActionSupport();
        return confluenceActionSupport;
    }

	public String getText(String key) {
        String result = key;
        if (getConfluenceActionSupport() != null) {
            result = confluenceActionSupport.getText(key);
        }
        return result;
    }

}
